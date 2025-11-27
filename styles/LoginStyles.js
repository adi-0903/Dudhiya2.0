import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D47A1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    letterSpacing: 1,
  },
  whiteContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 25,
    paddingTop: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginBottom: 230
  },
  waveTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0,
    backgroundColor: '#0D47A1',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 15,
    paddingHorizontal: 20,
    marginVertical: 10,
    height: 60,
    borderWidth: 1,
    borderColor: '#E1E8F0',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0D47A1',
    borderRadius: 15,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#0D47A1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  forgotPassword: {
    textAlign: 'right',
    color: '#0D47A1',
    marginTop: 15,
    fontSize: 14,
    fontWeight: '500',
  },
  signUpText: {
    color: '#64748B',
    textAlign: 'center',
    marginTop: 25,
    fontSize: 15,
  },
  signUpLink: {
    color: '#0D47A1',
    fontWeight: '600',
  },
  backButton: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
  },
  backButtonText: {
    color: '#0D47A1',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'none',
  },
});

export default styles;
